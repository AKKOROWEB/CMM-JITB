import {useEffect, useState} from 'react';
import styled from 'styled-components';
import Countdown from 'react-countdown';
import {Button, CircularProgress, Snackbar} from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';

import * as anchor from '@project-serum/anchor';

import {LAMPORTS_PER_SOL} from '@solana/web3.js';

import {useAnchorWallet} from '@solana/wallet-adapter-react';
import {WalletDialogButton} from '@solana/wallet-adapter-material-ui';

import {
  CandyMachine,
  awaitTransactionSignatureConfirmation,
  getCandyMachineState,
  mintOneToken,
  shortenAddress,
} from './candy-machine';

const ConnectButton = styled(WalletDialogButton)``;

const CounterText = styled.span``; // add your styles here

const MintContainer = styled.div``; // add your styles here

const MintButton = styled(Button)``; // add your styles here

export interface HomeProps {
  candyMachineId: anchor.web3.PublicKey;
  config: anchor.web3.PublicKey;
  connection: anchor.web3.Connection;
  startDate: number;
  treasury: anchor.web3.PublicKey;
  txTimeout: number;
}

const Home = (props: HomeProps) => {
  const [balance, setBalance] = useState<number>();
  const [isActive, setIsActive] = useState(false); // true when countdown completes
  const [isSoldOut, setIsSoldOut] = useState(false); // true when items remaining is zero
  const [isMinting, setIsMinting] = useState(false); // true when user got to press MINT

  const [itemsAvailable, setItemsAvailable] = useState(0);
  const [itemsRedeemed, setItemsRedeemed] = useState(0);
  const [itemsRemaining, setItemsRemaining] = useState(0);

  const [alertState, setAlertState] = useState<AlertState>({
    open: false,
    message: '',
    severity: undefined,
  });

  const [startDate, setStartDate] = useState(new Date(props.startDate));

  const wallet = useAnchorWallet();
  const [candyMachine, setCandyMachine] = useState<CandyMachine>();

  const refreshCandyMachineState = () => {
    (async () => {
      if (!wallet) return;

      const {
        candyMachine,
        goLiveDate,
        itemsAvailable,
        itemsRemaining,
        itemsRedeemed,
      } = await getCandyMachineState(
        wallet as anchor.Wallet,
        props.candyMachineId,
        props.connection
      );

      setItemsAvailable(itemsAvailable);
      setItemsRemaining(itemsRemaining);
      setItemsRedeemed(itemsRedeemed);

      setIsSoldOut(itemsRemaining === 0);
      setStartDate(goLiveDate);
      setCandyMachine(candyMachine);
    })();
  };

  const onMint = async () => {
    try {
      setIsMinting(true);
      if (wallet && candyMachine?.program) {
        const mintTxId = await mintOneToken(
          candyMachine,
          props.config,
          wallet.publicKey,
          props.treasury
        );

        const status = await awaitTransactionSignatureConfirmation(
          mintTxId,
          props.txTimeout,
          props.connection,
          'singleGossip',
          false
        );

        if (!status?.err) {
          setAlertState({
            open: true,
            message: 'Congratulations! Mint succeeded!',
            severity: 'success',
          });
        } else {
          setAlertState({
            open: true,
            message: 'Mint failed! Please try again!',
            severity: 'error',
          });
        }
      }
    } catch (error:any) {
      // TODO: blech:
      let message = error.msg || 'Minting failed! Please try again!';
      if (!error.msg) {
        if (error.message.indexOf('0x138')) {
        } else if (error.message.indexOf('0x137')) {
          message = `SOLD OUT!`;
        } else if (error.message.indexOf('0x135')) {
          message = `Insufficient funds to mint. Please fund your wallet.`;
        }
      } else {
        if (error.code === 311) {
          message = `SOLD OUT!`;
          setIsSoldOut(true);
        } else if (error.code === 312) {
          message = `Minting period hasn't started yet.`;
        }
      }

      setAlertState({
        open: true,
        message,
        severity: 'error',
      });
    } finally {
      if (wallet) {
        const balance = await props.connection.getBalance(wallet.publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      }
      setIsMinting(false);
      refreshCandyMachineState();
    }
  };

  useEffect(() => {
    (async () => {
      console.log(wallet);
      if (wallet) {
        console.log(wallet);
        const balance = await props.connection.getBalance(wallet.publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      }
    })();
  }, [wallet, props.connection]);

  useEffect(refreshCandyMachineState, [
    wallet,
    props.candyMachineId,
    props.connection,
  ]);

  return (
    <main>
      <style>
        {`
          .fnt-color-main {
            color: #ef4116;
          }
          .bg-color-main {
            background-color: #ef4116;
          }

          @media screen and (max-width: 576px) {
            .roadmap {
              min-height: 37rem;
            }
          }
          .w-90 {
            width: 70% !important;
          }
          .h-90 {
            height: 70% !important;
          }
          .icon-size {
            max-width: 400px;
            max-height: 400px;
            width: 100%;
            height: 100%;
          }
          .mw-360 {
            max-width: 360px;
          }
        `}
      </style>
      {/* STYLING */}
      <div
        className={`d-flex flex-column justify-content-center mx-auto text-white`}>
        {/* HEADER */}
        <div
          className={`header-section d-flex flex-column justify-content-center
            align-itens-center h-100 w-100`}>
          <div
            className={`js-font d-flex flex-column align-items-center justify-content-center col col-md-6 px-3`}>
            <img
              src='/Jack In The Blocks Title_Interactive LightMix.png'
              className={`h-100 w-100`}
              alt=''
            />
            {
              <div className='container mint-input d-flex flex-column justify-content-center align-items-center p-3 border border-dark w-100 my-4'>
                {wallet && (
                  <p>
                    Wallet {shortenAddress(wallet.publicKey.toBase58() || '')}
                  </p>
                )}

                {wallet && (
                  <p>Balance: {(balance || 0).toLocaleString()} SOL</p>
                )}

                {wallet && <p>Total Available: {itemsAvailable}</p>}

                {wallet && <p>Redeemed: {itemsRedeemed}</p>}

                {wallet && <p>Remaining: {itemsRemaining}</p>}

                {wallet && <p>Price: 0.165 SOL</p>}

                <MintContainer>
                  {!wallet ? (
                    <ConnectButton>Connect Wallet</ConnectButton>
                  ) : (
                    <MintButton
                      disabled={isSoldOut || isMinting || !isActive}
                      onClick={() => {
                        onMint();
                      }}
                      variant='contained'>
                      {isSoldOut ? (
                        'SOLD OUT'
                      ) : isActive ? (
                        isMinting ? (
                          <CircularProgress />
                        ) : (
                          'MINT'
                        )
                      ) : (
                        <Countdown
                          date={startDate}
                          onMount={({completed}: any) =>
                            completed && setIsActive(true)
                          }
                          onComplete={() => setIsActive(true)}
                          renderer={renderCounter}
                        />
                      )}
                    </MintButton>
                  )}
                </MintContainer>

                <Snackbar
                  open={alertState.open}
                  autoHideDuration={6000}
                  onClose={() => setAlertState({...alertState, open: false})}>
                  <Alert
                    onClose={() => setAlertState({...alertState, open: false})}
                    severity={alertState.severity}>
                    {alertState.message}
                  </Alert>
                </Snackbar>
              </div>
            }

            <div className='container d-flex flex-column justify-content-center align-items-center p-3 border border-dark w-100 my-4'>
              <p>{itemsRedeemed}/2978 Minted</p>
              <div className='progress position-relative mb-3'>
                <span className='nft-percent position-absolute top-50 start-50 translate-middle'>
                  {((itemsRedeemed / 2978) * 100).toFixed(2)}%
                </span>
                <div
                  style={{width: `${(itemsRedeemed / 2978) * 100}%`}}
                  className='progress-bar bg-blood'
                  role='progressbar'
                  aria-valuenow={itemsRedeemed}
                  aria-valuemin={0}
                  aria-valuemax={2978}></div>
              </div>
            </div>
          </div>
        </div>
        {/* MINT SECTION */}

        {/* PROFILE INFO */}
        <div
          className={`container d-flex flex-column justify-content-center
            align-itens-center px-3  px-md-5 py-5 roadmap mx-auto`}>
          <h1 className={`text-center punk-font mb-5`}>About Jacks</h1>
          <p>
            Jack In the Blocks is the first value added project to Evolved Punks
            and was painstakingly crafted in 3D with over 100 unique assets.
            Created professionally in 3D, Jack In the Blocks strived to create
            the utmost quality in all aspects. The first project to showcase and
            drive the 3D generative tech Punks Evolved was founded on and
            promised in future projects all part of the families ecosystem, it
            is not only a phenomenal NFT collection, but also the first to
            utilize and implement Punks Evolved’s value added incentives.
          </p>

          <p>
            With 2,978 Jacks available, it is a limited collection focused on
            quality, not quantity and every Jack is a statement piece. 14 Unique
            one of one Jacks are strewn about the collection, some with
            immediate and incredible rewards – congratulations in advance to
            whoever is lucky enough to pull these one of ones.
          </p>
          <p>
            Thank you for both your support in Punks Evolved and Jack In The
            Blocks, and we couldn’t be more excited to have you a part of our
            family of projects, all which will work in tandem with one another
            to provide consistent value, and quality projects for all our
            community members who believe in them.
          </p>
        </div>
        {/* ROADMAP */}
        <div
          className={`roadmap mx-auto d-flex flex-row justify-content-center
            align-items-center`}>
          <img
            className={`text-center w-100 h-100 d-flex d-lg-none`}
            src={
              'https://cdn.discordapp.com/attachments/905542266549047336/946346356396675102/Roadmap_squared_optimized_for_mobile.png'
            }
            alt='roadmap'
          />
          <img
            className={`text-center w-100 h-100 d-none d-lg-flex`}
            src={
              'https://cdn.discordapp.com/attachments/905542266549047336/946346425292316682/Roadmap_Banner_optimized_and_clipped_for_web.png'
            }
            alt='roadmap'
          />
        </div>
        {/* Punks Evolved */}
        <div
          className={`container-fluid Punks-Evolved-container d-flex flex-column justify-content-center
            align-itens-center px-3 px-md-5 py-5`}>
          <div className={`d-flex flex-column  col-md-6 `}>
            <h1 className={`punk-font mb-5`}>Punks Evolved?</h1>
            <p>
              Punks Evolved is the Genesis project to all things 3D in our family of projects - it's the one that started it all and our premium airdrop pass to all things 3D
            </p>

            <div
              className={`d-flex flex-column flex-md-row justify-content-start align-items-center`}>
              <a
                className={`jitb-style-btn d-flex flex-row align-items-center btn btn-light text-uppercase my-4 m-2 p-4`}
                href={'https://www.magiceden.io/marketplace/punks_evolved'}>
                Magic Eden
              </a>
            </div>
          </div>
        </div>
        {/* FAQ */}
        <div
          className={`container d-flex flex-column justify-content-center
            align-itens-center px-3  px-md-5 py-5 text-capitalize`}>
          <img
            src={'/FAQ_Interactive LightMix.png'}
            alt='roadmap'
            className='img-fluid mb-5'
          />
          <div className={`d-flex flex-column roadmap mx-auto`}>
            <p>
              <strong>How can I purchase a Jack?</strong>
            </p>
            <p>
              Connect Your Wallet To The Website with phantom wallet and hit
              mint and approve - It’s As Simple As That!
            </p>

            <p>
              <strong>How much does a punk cost?</strong>
            </p>

            <p>0.165 SOL</p>

            <p>
              <strong>
                What Tools/Frameworks Are Jack In The Blocks built with?
              </strong>
            </p>
            <p>Jack In The Blocks are built with Metaplex Candy Machine</p>

            <p>
              <strong>Is every Jack truly unique?</strong>
            </p>
            <p>
              Yes! We’ve ensured there will be no duplicate Jacks, and all will
              be 100% unique combinations
            </p>

            <p>
              <strong>Who can I contact if I have a problem?</strong>
            </p>

            <p>
              You can contact any of our administrators in our Discord if you
              run into any issues! We’re always here to help
            </p>
          </div>
        </div>
        {/* SOCIALS*/}
        <div
          className={`container-fluid socials d-flex flex-column justify-content-center
            align-itens-center px-3  px-md-5 py-5`}>
          <div
            className={`d-flex flex-column flex-md-row justify-content-around align-items-center`}>
            {/* <a
              className={`jitb-style-btn d-flex flex-row align-items-center btn btn-light text-uppercase my-4 mx-2 p-4`}
              href={'https://opensea.io/collection/jackintheblocks'}>
              Opensea
            </a> */}
            <a
              className={`jitb-style-btn d-flex flex-row align-items-center btn btn-light text-uppercase my-4 mx-2 p-4`}
              href={'https://punksevolved.io/'}>
              Punks Evolved
            </a>
            <a
              className={`jitb-style-btn d-flex flex-row align-items-center btn btn-light text-uppercase my-4 mx-2 p-4`}
              href={'https://twitter.com/JacksInTheBlock'}>
              Twitter
            </a>
            <a
              className={`jitb-style-btn d-flex flex-row align-items-center btn btn-light text-uppercase my-4 p-4`}
              href={'http://discord.gg/s99MhhmttM'}>
              Discord
            </a>
          </div>
        </div>
        <div className={`d-flex flex-row justify-content-start px-4`}>
          <p className={`m-0`}>© COPYRIGHT JACK IN BLOCKS 2021</p>
        </div>
      </div>
      <hr className={`container`} />
    </main>
  );
};

interface AlertState {
  open: boolean;
  message: string;
  severity: 'success' | 'info' | 'warning' | 'error' | undefined;
}

const renderCounter = ({days, hours, minutes, seconds, completed}: any) => {
  return (
    <CounterText>
      {hours + (days || 0) * 24} hours, {minutes} minutes, {seconds} seconds
    </CounterText>
  );
};

export default Home;
